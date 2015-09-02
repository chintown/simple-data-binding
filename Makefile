# ex:ts=8:sw=8:noexpandtab
#.PHONY: clean

PWD := $(shell pwd)

%: # for all not matched target
	@: # do nothing silently

app:
	@if [[ '${name}' = '' ]]; then echo 'USAGE: make app name=<name>'; exit; fi
	@echo 'generating...';
	@find $(PWD) -type f -name 'boilerplate.*' | while read -r path_from; do \
		path_to=$${path_from//boilerplate/${name}};\
		echo $$path_to;\
		cp "$$path_from" "$$path_to";\
		perl -pi -e "s/boilerplate\./${name}\./" "$$path_to";\
	done

purge:
	@if [[ '${name}' = '' ]]; then echo 'USAGE: purge app name=<name>'; exit; fi
	@echo 'Prepare purging...';
	@find $(PWD) -type f -name '${name}.*' | while read -r path_tar; do \
		echo $$path_tar;\
	done
	@while [ -z "$$should_purge" ]; do \
	  read -r -p "Continue (y/n): " should_purge; \
  done && \
	case "$$should_purge" in\
	  y|Y )\
			find $(PWD) -type f -name '${name}.*' | while read -r path_tar; do \
			 	rm "$$path_tar";\
		 	done;\
			echo "Done.";;\
	  n|N ) echo "Abort.";;\
	  * ) echo "Abort.";;\
	esac
